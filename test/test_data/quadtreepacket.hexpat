// https://github.com/google/earthenterprise/blob/master/earth_enterprise/src/common/qtpacket/quadtreepacket.cpp

struct Header {
    u32 magic_id; //32301
    u32 data_type_id;
    u32 version;
    u32 num_instances [[name("节点个数")]];
    u32 data_instance_size [[name("节点大小")]];
    u32 data_buffer_offset;
    u32 data_buffer_size;
    u32 meta_buffer_size;
};

// https://github.com/google/earthenterprise/blob/893f6b470673e2bad4cacdd8eec5ad1f179b6249/earth_enterprise/src/common/qtpacket/quadtreepacket.cpp#L357
struct Node {
     u8 Bitfield;
     padding[1];
     u16 cnode_version;
     u16 image_version;
     u16 terrain_version;
     u16 num_channels;
     padding[2];
     u32 type_offset;
     u32 version_offset;
     u64 image_neighbors;
     u8 image_data_provider;
     u8 terrain_data_provider;
};

struct Quadtreepacket {
    
    Header header [[name("Header")]];
    Node nodes[header.num_instances];
};


Quadtreepacket quadtreepacket @ 0x00;